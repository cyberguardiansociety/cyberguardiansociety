import { Request, Response } from 'express'
import { UserService } from '../services/user.service'
import { catchAsync } from '../utils/catchAsync'

export class UserController {
  /**
   * Handles public contact inquiries & speaker proposals
   * POST /api/contact
   */
  static handleContact = catchAsync(async (req: Request, res: Response) => {
    const { name, email, message, source, metadata } = req.body
    const result = await UserService.createContactMessage({
      name,
      email,
      message,
      source,
      metadata,
    })
    res.status(200).json(result)
  })

  /**
   * Handles quick membership interest submissions
   * POST /api/join
   */
  static handleQuickJoin = catchAsync(async (req: Request, res: Response) => {
    const { fullName, email, motivation, age, background } = req.body
    const result = await UserService.createQuickJoin({
      fullName,
      email,
      motivation,
      age,
      background,
    })
    res.status(200).json(result)
  })
}
